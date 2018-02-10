export default class NestedWriter {
    private level = 0;
    private buffer: string[] = [];

    inc() {
        this.level++;
        return this;
    }

    dec() {
        this.level--;
        if (this.level < 0) {

        }
        return this;
    }

    writeLine(line?: string) {
        if (line === undefined) {
            this.buffer.push('');
            return;
        }
        this.buffer.push('    '.repeat(this.level) + line);
        return this;
    }

    toString() {
        return this.buffer.join('\n');
    }
}
