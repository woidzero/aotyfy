class Logger {
    id: string;
    scope: string;

    constructor(id: string) {
        this.id = id;
        this.scope = "[" + id + "]";
    }

    info(...data: any[]) {
        console.info(this.scope, ...data);
    }

    warn(...data: any[]) {
        console.warn(this.scope, ...data);
    }

    error(...data: any[]) {
        console.error(this.scope, ...data);
    }

    debug(...data: any[]) {
        console.debug(this.scope, ...data);
    }
}

const log = new Logger("aotyfy");
export default log;