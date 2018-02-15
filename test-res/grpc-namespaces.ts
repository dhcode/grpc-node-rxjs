import { Observable } from 'rxjs/Observable';
import * as grpc from 'grpc';

export namespace grpctest {
    export enum Position {
        ONE = 0,
        TWO = 1,
    }


    /**
     * The TestRunner service
     * It has several methods to test all the different scenarios.
     */
    export interface TestRunner {

        /**
         * Takes a request and returns a single response
         */
        UnaryMethod(request: TestRequest, metaData?: grpc.Metadata): Observable<TestResponse>;

        /**
         * Takes a stream of requests
         */
        StreamRequestMethod(request: Observable<TestRequest>, metaData?: grpc.Metadata): Observable<TestResponse>;
        StreamResponseMethod(request: TestRequest, metaData?: grpc.Metadata): Observable<TestResponse>;
        TestBidirectionalStream(request: Observable<TestRequest>, metaData?: grpc.Metadata): Observable<TestResponse>;
    }

    export interface TestRequest {

        /**
         * Name
         */
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
