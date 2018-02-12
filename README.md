# GRPC Node RxJS

This is a library that wraps the grpc node client to make it Reactive based on `rxjs` Observables.

If you are used to work with Observables in TypeScript with node.js and would like to implement GRPC services, this is the right library.


Install it:

    npm install grpc-node-rxjs
    

## Generate types

Generate typing for your proto files.
Usage:

    rpc-node-rxjs file1.proto [file2.proto] [-o namespaces.ts]

Example:

    grpc-node-rxjs proto/testservice.proto -o proto/grpc-namespaces.ts


## Server example

See [src/GrpcRx.spec.ts](src/GrpcRx.spec.ts) for more examples.

```typescript
import { createServer } from 'grpc-node-rxjs';
import { Observable } from 'rxjs/Observable';
import * as grpc from 'grpc';
import { of } from 'rxjs/observable/of';
import { grpctest } from './test-res/grpc-namespaces';

const PROTO_PATH = __dirname + '/test-res/testservice.proto';

const server: grpctest.Server = createServer<grpctest.Server>(PROTO_PATH, 'grpctest');
server.addTestRunner({
     UnaryMethod(request: grpctest.TestRequest,
                 metaData?: grpc.Metadata): Observable<grpctest.TestResponse> {
         return of({message: 'unary ' + request.name, position: grpctest.Position.ONE});
     }
});
server.bind('127.0.0.1:5120', grpc.ServerCredentials.createInsecure());
server.start();

```

## Client example

```typescript
import { createClient } from 'grpc-node-rxjs';
import { grpctest } from './test-res/grpc-namespaces';
import * as grpc from 'grpc';

const PROTO_PATH = __dirname + '/test-res/testservice.proto';

const client = createClient<grpctest.ClientBuilder>(PROTO_PATH, 'grpctest');
const testRunner = client.getTestRunner('127.0.0.1:5120', grpc.credentials.createInsecure());
const metaData = new grpc.Metadata();
metaData.set('special', 'x');
testRunner.UnaryMethod({name: 'a'}, metaData).subscribe(response => {
    console.log('response', response);
});
```


## Inspiration

This project is inspired by [rxjs-grpc](https://github.com/kondi/rxjs-grpc), which wasn't supporting all combinations of rpc calls with streams in February 2018. And the generated typings didn't support metaData for rpc calls, which was very complicated to add, because it uses pbjs/pbts to generate the typings. grpc-node-rxjs uses a simpler approach.

## Note on dependencies

Wait for grpc 1.9.0 update to have fixed the [Message type issue](https://github.com/grpc/grpc-node/pull/177)


## License

[MIT](LICENSE)
