import { createClient, createServer } from './GrpcRx';
import { grpctest } from '../test-res/grpc-namespaces';
import { Observable } from 'rxjs/Observable';
import * as grpc from 'grpc';
import { of } from 'rxjs/observable/of';
import * as assert from 'assert';

const PROTO_PATH = __dirname + '/../test-res/testservice.proto';

describe('GrpcRx Test', function () {
    let server: grpctest.Server, testRunner: grpctest.TestRunnerClient;

    const defaultMethods: grpctest.TestRunner = {
        UnaryMethod(request: grpctest.TestRequest,
                    metaData?: grpc.Metadata): Observable<grpctest.TestResponse> {
            return of({message: 'unary ' + request.name, position: grpctest.Position.ONE});
        },

        StreamRequestMethod(request: Observable<grpctest.TestRequest>,
                            metaData?: grpc.Metadata): Observable<grpctest.TestResponse> {
            return null;
        },

        StreamResponseMethod(request: grpctest.TestRequest,
                             metaData?: grpc.Metadata): Observable<grpctest.TestResponse> {
            return null;
        },

        TestBidirectionalStream(request: Observable<grpctest.TestRequest>,
                                metaData?: grpc.Metadata): Observable<grpctest.TestResponse> {
            return null;
        }
    };

    function prepareServerAndClient(impl: grpctest.TestRunner) {
        server = createServer<grpctest.Server>(PROTO_PATH, 'grpctest');
        server.addTestRunner(impl);
        server.bind('127.0.0.1:5120', grpc.ServerCredentials.createInsecure());
        server.start();

        const client = createClient<grpctest.ClientBuilder>(PROTO_PATH, 'grpctest');
        testRunner = client.getTestRunner('127.0.0.1:5120', grpc.credentials.createInsecure());
        console.log('prepareServerAndClient');
    }

    afterEach('should shutdown', function (done: MochaDone) {
        if (testRunner) {
            testRunner.close();
        }
        if (server) {
            console.log('shutdown start');
            server.tryShutdown(() => {
                console.log('shutdown complete');
                done();
            });
        } else {
            done();
        }
    });

    it('should run unary method', function (done: MochaDone) {

        prepareServerAndClient({
            UnaryMethod(request: grpctest.TestRequest,
                        metaData?: grpc.Metadata): Observable<grpctest.TestResponse> {
                return of({message: 'unary ' + request.name + ' ' + metaData.get('special'), position: grpctest.Position.ONE});
            },
            StreamRequestMethod: defaultMethods.StreamRequestMethod,
            StreamResponseMethod: defaultMethods.StreamResponseMethod,
            TestBidirectionalStream: defaultMethods.TestBidirectionalStream
        });

        const metaData = new grpc.Metadata();
        metaData.set('special', 'x');

        testRunner.UnaryMethod({name: 'a'}, metaData).subscribe(response => {
            console.log('response', response);
            assert.equal(response.message, 'unary a x');

        }, error => done(error), () => done());

    });

    it('should run streaming request', function (done: MochaDone) {

        prepareServerAndClient({
            UnaryMethod: defaultMethods.UnaryMethod,
            StreamRequestMethod(request: Observable<grpctest.TestRequest>): Observable<grpctest.TestResponse> {
                return Observable.create(observer => {
                    let count = 0;
                    request.subscribe(req => {
                        if (req.name === 'a') {
                            count++;
                        }
                    }, err => assert.ifError(err), () => {
                        observer.next({message: 'c' + count, position: grpctest.Position.ONE});
                        observer.complete();
                    });
                });
            },
            StreamResponseMethod: defaultMethods.StreamResponseMethod,
            TestBidirectionalStream: defaultMethods.TestBidirectionalStream
        });

        testRunner.StreamRequestMethod(of({name: 'a'}, {name: 'b'}, {name: 'a'})).subscribe(response => {
            console.log('response', response);
            assert.equal(response.message, 'c2');

        }, error => done(error), () => done());

    });

    it('should run streaming response', function (done: MochaDone) {

        prepareServerAndClient({
            UnaryMethod: defaultMethods.UnaryMethod,
            StreamRequestMethod: defaultMethods.StreamRequestMethod,
            StreamResponseMethod(request: grpctest.TestRequest): Observable<grpctest.TestResponse> {
                console.log('server got request ', request);
                return Observable.create(observer => {
                    request.name.split('').forEach(char => {
                        console.log('send char_' + char);
                        observer.next({message: 'char_' + char, position: grpctest.Position.ONE});
                    });
                    observer.complete();
                });
            },
            TestBidirectionalStream: defaultMethods.TestBidirectionalStream
        });

        const expected = 'abcd'.split('');
        let i = 0;
        testRunner.StreamResponseMethod({name: 'abcd'}).subscribe(response => {
            console.log('response', response);
            assert.equal(response.message, 'char_' + expected[i++]);

        }, error => done(error), () => done());

    });

    it('should run bidirectional streaming', function (done: MochaDone) {

        prepareServerAndClient({
            UnaryMethod: defaultMethods.UnaryMethod,
            StreamRequestMethod: defaultMethods.StreamRequestMethod,
            StreamResponseMethod: defaultMethods.StreamResponseMethod,
            TestBidirectionalStream(request: Observable<grpctest.TestRequest>): Observable<grpctest.TestResponse> {
                return Observable.create(observer => {
                    let received = 0;
                    request.subscribe(req => {
                        received++;
                        if (req.name === 'status') {
                            observer.next({message: 'status_' + received, position: grpctest.Position.ONE});
                        }
                    }, err => observer.error(err), () => observer.complete());

                });
            }
        });

        let i = 0;
        const messages = [
            {name: 'xy'},
            {name: 'status'},
            {name: 'df'},
            {name: 'status'}
        ];
        testRunner.TestBidirectionalStream(of(...messages)).subscribe(response => {
            console.log('response', response);
            assert.equal(response.message, 'status_' + (i += 2));

        }, error => done(error), () => {
            assert.equal(i, 4);
            done();
        });

    });


});

