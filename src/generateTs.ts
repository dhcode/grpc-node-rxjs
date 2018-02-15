import * as protobuf from 'protobufjs';
import {Enum, Field, Method, Namespace, ReflectionObject, Service, Type} from 'protobufjs';
import * as fs from 'fs';
import * as util from 'util';
import NestedWriter from './utils/NestedWriter';

export async function generateTsFromFile(files): Promise<string> {

    const root = new protobuf.Root();
    await root.load(files);

    return generateFromRoot(root);
}

export async function generateTsFromString(...protoSources: string[]): Promise<string> {

    const root = new protobuf.Root();
    protoSources.forEach(source => protobuf.parse(source, root));

    return generateFromRoot(root);
}

function generateFromRoot(root: protobuf.Root) {
    const target = new NestedWriter();
    target.writeLine(`import { Observable } from 'rxjs/Observable';`);
    target.writeLine(`import * as grpc from 'grpc';`).writeLine();

    print(root.nested, target);

    return target.toString();
}

interface ReflectionObjectsMap {
    [k: string]: ReflectionObject;
}

function print(nested: ReflectionObjectsMap, target: NestedWriter) {
    if (!nested) {
        return;
    }
    Object.keys(nested).forEach(ns => {
        const o = nested[ns];

        if (o instanceof Service) {
            printService(o, target);
        } else if (o instanceof Enum) {
            printEnum(o, target);
        } else if (o instanceof Type) {
            printType(o, target);
        } else if (o instanceof Namespace) {
            printNamespace(o, target);
        }

    });
}

function printNamespace(source: Namespace, target: NestedWriter) {
    if (source.comment) {
        printComment(source.comment, target);
    }
    target.writeLine('export namespace ' + source.name + ' {').inc();
    print(source.nested, target);
    printServer(source.nested, target);
    printClient(source.nested, target);
    target.dec().writeLine('}').writeLine();
}

function printServer(nested: ReflectionObjectsMap, target: NestedWriter) {
    if (!nested) {
        return;
    }
    const services = Object.keys(nested)
        .map(ns => nested[ns])
        .filter(o => o instanceof Service);
    if (!services.length) {
        return;
    }

    target.writeLine('export interface Server extends grpc.Server {').inc();
    services.forEach((service: Service) => {
        target.writeLine(`add${service.name}(impl: ${service.name});`);
    });
    target.dec().writeLine('}').writeLine();

}

function printClient(nested: ReflectionObjectsMap, target: NestedWriter) {
    if (!nested) {
        return;
    }
    const services = Object.keys(nested)
        .map(ns => nested[ns])
        .filter(o => o instanceof Service);
    if (!services.length) {
        return;
    }

    services.forEach((service: Service) => {
        target.writeLine(`export interface ${service.name}Client extends grpc.Client, ${service.name} {}`);
    });
    target.writeLine();

    target.writeLine('export interface ClientBuilder {').inc();
    services.forEach((service: Service) => {
        target.writeLine(
            `get${service.name}(address: string, credentials: grpc.ChannelCredentials, options?: object): ${service.name}Client;`);
    });
    target.dec().writeLine('}').writeLine();

}

function printComment(comment: string, target: NestedWriter) {
    target.writeLine();
    target.writeLine('/**');
    comment.split('\n').forEach(line => {
        target.writeLine(' * ' + line);
    });
    target.writeLine(' */');
}

function printService(source: Service, target: NestedWriter) {
    if (source.comment) {
        printComment(source.comment, target);
    }
    target.writeLine('export interface ' + source.name + ' {').inc();

    for (let method of Object.keys(source.methods)) {
        printMethod(source.methods[method], target);
    }

    target.dec().writeLine('}').writeLine();
}

function printMethod(source: Method, target: NestedWriter) {
    if (source.comment) {
        printComment(source.comment, target);
    }
    const reqType = source.requestStream ? `Observable<${source.requestType}>` : source.requestType;
    target.writeLine(`${source.name}(request: ${reqType}, metaData?: grpc.Metadata): Observable<${source.responseType}>;`);
}

function printType(source: Type, target: NestedWriter) {
    if (source.comment) {
        printComment(source.comment, target);
    }
    target.writeLine('export interface ' + source.name + ' {').inc();

    for (let field of Object.keys(source.fields)) {
        printField(source.fields[field], target);
    }

    target.dec().writeLine('}').writeLine();
}

function printEnum(source: Enum, target: NestedWriter) {
    if (source.comment) {
        printComment(source.comment, target);
    }
    target.writeLine('export enum ' + source.name + ' {').inc();

    for (let value of Object.keys(source.values)) {
        target.writeLine(`${value} = ${source.values[value]},`);
    }

    target.dec().writeLine('}').writeLine();
}

function printField(source: Field, target: NestedWriter) {
    if (source.comment) {
        printComment(source.comment, target);
    }
    target.writeLine(source.name + ': ' + source.type + ';');
}

export function cli() {
    let output = 'stdout';
    const files = process.argv.slice(2);
    for (let i = 0; i < files.length; i++) {
        const arg = files[i];
        if (arg === '-o') {
            output = files[i + 1];
            files.splice(i, 2);
            i--;
        }

    }
    if (!files.length) {
        console.log('No files');
        console.log('Usage:');
        console.log('grpc-node-rxjs file1.proto [file2.proto] [-o namespaces.ts]');
        process.exit(1);
    }
    generateTsFromFile(files).then(result => {
        if (output === 'stdout') {
            process.stdout.write(result);
        } else {
            return util.promisify(fs.writeFile)(output, result);
        }
    }).catch(console.error);
}

if (!module.parent) {
    cli();
}
