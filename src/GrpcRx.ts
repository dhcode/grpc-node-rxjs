import * as grpc from 'grpc';
import {Observable} from 'rxjs/Observable';
import {ChannelCredentials} from 'grpc';


export function createServer<T extends grpc.Server>(protoPath: string, ns: string): T {
    const server = new grpc.Server() as T;

    const root = grpc.load(protoPath);
    const nsPkg = lookupNamespace(root, ns);
    const serviceNames = getServiceNames(nsPkg);

    serviceNames.forEach(serviceName => {
        server[`add${serviceName}`] = (impl) => {
            const serviceClient = nsPkg[serviceName] as any;
            server.addService(serviceClient.service, createService(nsPkg[serviceName], impl));
        };
    });


    return server;
}

export function createClient<T>(protoPath: string, ns: string): T {
    const root = grpc.load(protoPath);
    const nsPkg = lookupNamespace(root, ns);

    const serviceNames = getServiceNames(nsPkg);

    const client: any = {};

    serviceNames.forEach(serviceName => {
        client[`get${serviceName}`] = (address: string, credentials: ChannelCredentials, options?: object) => {
            const clientConstructor = nsPkg[serviceName] as any;
            const serviceClient = new clientConstructor(address, credentials, options);
            return createServiceClient(serviceClient);
        };
    });

    return client;
}

// Inspired, copied and modified from https://github.com/kondi/rxjs-grpc/blob/master/src/index.ts (MIT License)

function lookupNamespace(root: grpc.GrpcObject, ns: string): grpc.GrpcObject {
    let pkg: grpc.GrpcObject = root;
    for (const name of ns.split(/\./)) {
        pkg = pkg[name] as grpc.GrpcObject;
    }
    return pkg;
}

function getServiceNames(pkg: grpc.GrpcObject) {
    return Object.keys(pkg).filter(name => (pkg[name] as any).service);
}

type DynamicMethods = { [name: string]: any; };

function createService(sourceService: any, rxImpl: DynamicMethods) {
    const service: DynamicMethods = {};
    Object.keys(sourceService.prototype).forEach(methodName => {
        if (typeof rxImpl[methodName] === 'function') {
            service[methodName] = createMethod(rxImpl, methodName, sourceService.prototype);
        }
    });
    return service;
}

function createMethod(rxImpl: DynamicMethods, name: string, serviceMethods: DynamicMethods) {
    const methodInfo = serviceMethods[name];
    if (methodInfo.responseStream && methodInfo.requestStream) {
        return createBidirectionalStreamingMethod(rxImpl, name);

    } else if (methodInfo.responseStream) {
        return createResponseStreamingMethod(rxImpl, name);

    } else if (methodInfo.requestStream) {
        return createRequestStreamingMethod(rxImpl, name);

    } else {
        return createUnaryMethod(rxImpl, name);
    }
}

function createUnaryMethod(rxImpl: DynamicMethods, name: string) {
    return function (call: any, callback: any) {
        const response: Observable<any> = rxImpl[name](call.request, call.metadata);
        response.subscribe(
            data => callback(null, data),
            error => callback(error)
        );
    };
}

function createResponseStreamingMethod(rxImpl: DynamicMethods, name: string) {
    return async function (call: any) {
        const response: Observable<any> = rxImpl[name](call.request, call.metadata);
        await response.forEach(data => call.write(data));
        call.end();
    };
}

function createRequestStreamingMethod(rxImpl: DynamicMethods, name: string) {
    return function (call: any, callback: any) {
        const requestStream = new Observable(subscriber => {
            call.on('data', request => {
                subscriber.next(request);
            });
            call.on('end', () => {
                subscriber.complete();
            });
        });
        const response: Observable<any> = rxImpl[name](requestStream, call.metadata);
        response.subscribe(
            data => callback(null, data),
            error => callback(error)
        );
    };
}

function createBidirectionalStreamingMethod(rxImpl: DynamicMethods, name: string) {
    return async function (call: any) {
        const requestStream = new Observable(subscriber => {
            call.on('data', request => {
                subscriber.next(request);
            });
            call.on('end', () => {
                subscriber.complete();
            });
        });
        const response: Observable<any> = rxImpl[name](requestStream, call.metadata);
        await response.forEach(data => call.write(data));
        call.end();
    };
}


function createServiceClient(grpcClient: any) {
    const rxClient: DynamicMethods = Object.create(grpcClient);
    for (const name of Object.keys(grpcClient.__proto__)) {
        rxClient[name] = createClientMethod(grpcClient, name);
    }
    return rxClient;
}

function createClientMethod(grpcClient: DynamicMethods, name: string) {
    const methodInfo = grpcClient[name];
    if (methodInfo.responseStream && methodInfo.requestStream) {
        return createBiDirectionalStreamingClientMethod(grpcClient, name);

    } else if (methodInfo.responseStream) {
        return createResponseStreamingClientMethod(grpcClient, name);

    } else if (methodInfo.requestStream) {
        return createRequestStreamingClientMethod(grpcClient, name);

    } else {
        return createUnaryClientMethod(grpcClient, name);
    }

}

function createUnaryClientMethod(grpcClient: DynamicMethods, name: string) {
    return function (request: any, metaData: grpc.Metadata = new grpc.Metadata(), options: object = {}) {
        return Observable.create(observer => {
            grpcClient[name](request, metaData, options, (error: any, data: any) => {
                if (error) {
                    observer.error(error);
                } else {
                    observer.next(data);
                }
                observer.complete();
            });
        });
    };
}

function createResponseStreamingClientMethod(grpcClient: DynamicMethods, name: string) {
    return function (request: any, metaData: grpc.Metadata = new grpc.Metadata(), options: object = {}) {
        return Observable.create(observer => {
            const call = grpcClient[name](request, metaData, options);
            call.on('data', (data: any) => observer.next(data));
            call.on('error', (error: any) => observer.error(error));
            call.on('end', () => observer.complete());
        });
    };
}

function createRequestStreamingClientMethod(grpcClient: DynamicMethods, name: string) {
    return function (request: Observable<any>, metaData: grpc.Metadata = new grpc.Metadata(), options: object = {}) {
        return Observable.create(observer => {
            const call = grpcClient[name](metaData, options, (error: any, data: any) => {
                if (error) {
                    observer.error(error);
                } else {
                    observer.next(data);
                }
                observer.complete();
            });
            request.subscribe(
                data => call.write(data),
                error => call.destroy(error),
                () => call.end()
            );
        });
    };
}

function createBiDirectionalStreamingClientMethod(grpcClient: DynamicMethods, name: string) {
    return function (request: Observable<any>, metaData: grpc.Metadata = new grpc.Metadata(), options: object = {}) {
        return Observable.create(observer => {
            const call = grpcClient[name](metaData, options);
            call.on('data', data => observer.next(data));
            call.on('error', error => observer.error(error));
            call.on('end', () => observer.complete());
            request.subscribe(
                data => call.write(data),
                error => call.destroy(error),
                () => call.end()
            );
        });
    };
}
