module.exports = class {
    constructor(addr, port, onconnect = (e) => console.log("LazyDB is ready!"), onclose = (e) => {console.log("LazyDB server lost!")}, secure = true) {
        this.addr = addr;
        this.port = port;
        this.id = 0;

        this.lazy_sep = "\t\n\"lazy_sep\"\t\n";

        this.callbacks = {};
        this.messageQueue = [];

        let sec = "";
        if(secure) {
            sec += "s";
        }

        const W3CWebSocket = require('websocket').w3cwebsocket;
        this.ws = new W3CWebSocket(`ws${sec}://${addr}:${port}`);
        this.ws.onerror = function(error) {
            console.log('Connection Error');
        };
        this.ws.onopen = e => onconnect(e);
        this.ws.onclose = e => onclose(e);
        this.ws.onmessage = e => {
            let messages = e.data.split("|");

            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                let data = this.messageToJavascript(msg);
                if (data.s) {
                    this.callbacks[data.id].resolve(data.r);
                } else {
                    this.callbacks[data.id].reject(data.r);
                }

                if(!this.callbacks[data.id].sync) {
                    delete this.callbacks[data.id];
                } else {
                    this.callbacks[data.id].sync(data.r);
                }
            }
        };

        this.sendQueue = function (self) {
            if(self.messageQueue.length > 0 && (self.ws.readyState === self.ws.OPEN)) {
                self.ws.send(self.messageQueue.join("|"));
                self.messageQueue = [];
            }
        };

        setInterval(this.sendQueue, 100, this);
    };

    messageToJavascript(msg) {
        const reg = new RegExp(this.lazy_sep,"g");
        return JSON.parse(msg.replace(reg, "|"));
    };

    javascriptToMessage(data) {
        const msg = JSON.stringify(data);
        return msg.replace(/\|[\d|]*/g, this.lazy_sep);
    };

    send(name, args, fun = console.log) {
        const id = ++this.id;
        const self = this;

        const message = this.javascriptToMessage({
            "c": name,
            "id" :id,
            "a": args
        });

        if(message.includes("|")) {
            alert("You can\"t use | characters!");

            return false;
        }

        let callback = new Promise((resolve, reject) => {
            if(!self.callbacks[id]) {
                self.callbacks[id] = {};
            }

            self.callbacks[id].resolve = resolve;
            self.callbacks[id].reject = reject;
            if(name === "on" || name === "watch" || name === "size" || name === "sort") {
                self.callbacks[id].sync = fun;
            }
        });

        this.messageQueue.push(message);

        return callback;
    };

    forgot_password(email = "") {
        return this.send("forgot_password", {
            email
        });
    };

    edit_password(password, uid = "") {
        return this.send("edit_password", {
            password,
            uid
        });
    };

    connect(email, password) {
        return this.send("connect", {
            email,
            password
        });
    };

    register(email, password, username, full_name = "") {
        return this.send("register", {
            email,
            username,
            full_name,
            password
        });
    };

    create(keyPath, value = {}, w = true) {
        keyPath = keyPath.split("/");

        return this.send("create", {
            keyPath,
            value,
            w
        });
    };

    append(keyPath, value = {}) {
        keyPath = keyPath.split("/");

        return this.send("append", {
            keyPath,
            value
        });
    };

    on(command, keyPath) {
        return {
            then: async fn => {
                keyPath = keyPath.split("/");

                return await this.send("on", {
                    keyPath,
                    command
                }, fn);
            }
        }
    };

    watch(command, keyPath) {
        return {
            then: async fn => {
                keyPath = keyPath.split("/");

                return this.send("watch", {
                    keyPath,
                    command
                }, fn);
            }
        }
    };

    ping(command, keyPath) {
        return {
            then: async fn => {
                keyPath = keyPath.split("/");

                return await this.send("on", {
                    keyPath,
                    command
                }, fn);
            }
        }
    };

    stop(event, command, keyPath) {
        keyPath = keyPath.split("/");

        return this.send("stop", {
            event,
            command,
            keyPath
        });
    };

    size(keyPath) {
        return {
            then: async fn => {
                keyPath = keyPath.split("/");

                return await this.send("size", {
                    keyPath
                }, fn);
            }
        }
    };

    sort(keyPath, split = {char: "_", num: 1}, result = {count: 10, start: 0, order: "asc"}, order = "asc") {
        return {
            then: async fn => {
                keyPath = keyPath.split("/");

                return await this.send("sort", {
                    keyPath,
                    split,
                    result,
                    order
                }, fn);
            }
        }
    };

    get(keyPath, depth = 99) {
        keyPath = keyPath.split("/");

        return this.send("get", {
            keyPath,
            depth
        });
    };

    exist(keyPath) {
        keyPath = keyPath.split("/");

        return this.send("exist", {
            keyPath
        });
    };

    update(keyPath, value, w = true) {
        keyPath = keyPath.split("/");

        return this.send("update", {
            keyPath,
            value,
            w
        });
    };

    delete(keyPath) {
        keyPath = keyPath.split("/");

        return this.send("delete", {
            keyPath
        });
    };

    keys(keyPath, filter = "all") {
        keyPath = keyPath.split("/");

        return this.send("keys", {
            keyPath,
            filter
        });
    };

    join(gid) {
        return this.send("join", {
            gid
        });
    };

    invite(gid, uid, role) {
        return this.send("invite", {
            gid,
            uid,
            role
        });
    };

    leave(gid) {
        return this.send("leave", {
            gid
        });
    };
}
