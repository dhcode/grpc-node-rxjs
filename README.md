# GRPC Node RxJS

This is a library that wraps the grpc node client to make it Reactive based on `rxjs` Observables.

If you are used to work with Observables in TypeScript with node.js and would like to implement GRPC services, this is the right library.


Install it:

    npm install grpc-node-rxjs
    

## Generate types

Generate typing for your proto files:

    grpc-node-rxjs proto/testservice.proto -o proto/grpc-namespaces.ts

## Server example

```typescript
import { createServer } from 'grpc-node-rxjs';
// TODO
```

## Client example

```typescript
// TODO
```


## Inspiration

This project is inspired by [rxjs-grpc](https://github.com/kondi/rxjs-grpc), which wasn't supporting all combinations of rpc calls with streams in February 2018. And the generated typings didn't support metaData for rpc calls, which was very complicated to add, because it uses pbjs/pbts to generate the typings. grpc-node-rxjs uses a simpler approach.

## Note on dependencies

Wait for grpc 1.9.0 update to have fixed the [Message type issue](https://github.com/grpc/grpc-node/pull/177)


## License

[MIT](LICENSE)
