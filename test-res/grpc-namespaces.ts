import { Observable } from 'rxjs/Observable';
import * as grpc from 'grpc';

export namespace grpctest {
    export enum Position {
        ONE = 0,
        TWO = 1,
    }

    export interface TestRunner {
        UnaryMethod(request: TestRequest, metaData?: grpc.Metadata): Observable<TestResponse>;
        StreamRequestMethod(request: Observable<TestRequest>, metaData?: grpc.Metadata): Observable<TestResponse>;
        StreamResponseMethod(request: TestRequest, metaData?: grpc.Metadata): Observable<TestResponse>;
        TestBidirectionalStream(request: Observable<TestRequest>, metaData?: grpc.Metadata): Observable<TestResponse>;
    }

    export interface TestRequest {
        name: string;
    }

    export interface TestResponse {
        message: string;
        position: Position;
    }

    export interface Server extends grpc.Server {
        addTestRunner(impl: TestRunner);
    }

    export interface TestRunnerClient extends grpc.Client, TestRunner {}

    export interface ClientBuilder {
        getTestRunner(address: string, credentials: grpc.ChannelCredentials, options?: object): TestRunnerClient;
    }

}
