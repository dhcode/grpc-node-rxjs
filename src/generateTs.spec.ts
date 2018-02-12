import * as assert from 'assert';
import {generateTsFromString} from './generateTs';

describe('Generate Ts', function () {

    it('should generate ts code', async function () {

        const result = await generateTsFromString(
            `
        syntax = "proto3";
        package test;

        message Message {
          EnumType field = 2;
        }

        enum EnumType {
          ONE = 1;
          TWO = 2;
        }
      `
        );

        assert.ok(result.match(/export namespace test/));
        assert.ok(result.match(/export interface Message/));
        assert.ok(result.match(/export enum EnumType/));

        console.log('result', result);

    });

    it('should work with nested namespaces', async function () {
        const result = await generateTsFromString(
            `
        syntax = "proto3";
        package a;

        service AService {
          rpc Method (Message) returns (Message) {}
        }

        message Message {
          required string name = 1;
        }
      `,
            `
        syntax = "proto3";
        package a.b;

        service ABService {
          rpc Method (Message) returns (Message) {}
        }

        message Message {
          required string name = 1;
        }
      `,
            `
        syntax = "proto3";
        package a.b.c;

        service ABCService {
          rpc Method (Message) returns (Message) {}
        }

        message Message {
          required string name = 1;
        }
      `
        );

        console.log('result', result);
    });


});