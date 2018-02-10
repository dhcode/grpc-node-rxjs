# GRPC Node RxJS

This is a library that wraps the grpc node client to make it Reactive based on `rxjs` Observables.

If you are used to work with Observables in TypeScript with node.js and would like to implement GRPC services, this is the right library.


Install it:

    npm install grpc-node-rxjs
    
Generate typing for your proto files:

    grpc-node-rxjs proto/testservice.proto -o proto/grpc-namespaces.ts




## Inspiration

This project is inspired by [rxjs-grpc](https://github.com/kondi/rxjs-grpc), which wasn't supporting all combinations of rpc calls with streams in February 2018. And the generated typings didn't support metaData for rpc calls, which was very complicated to add, because it uses pbjs/pbts to generate the typings. grpc-node-rxjs uses a simpler approach.

## License

MIT