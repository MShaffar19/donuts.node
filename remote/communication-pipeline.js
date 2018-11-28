//-----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// Licensed under the MIT License. See License file under the project root for license information.
//-----------------------------------------------------------------------------

const { EventEmitter } = require("donuts.node/event-emitter");
const random = require("donuts.node/random");
const utils = require("donuts.node/utils");

/**
 * @template TOutgoingData, TIncomingData
 * @implements {Donuts.Remote.ICommunicationPipeline<TOutgoingData, TIncomingData>}
 */
class CommunicationPipeline extends EventEmitter {
    /**
     * @public
     * @param {Donuts.Logging.ILog} log
     * @param {string} [id]
     * @param {string} [moduleName]
     */
    constructor(log, id, moduleName) {
        super();

        /**
         * @public
         * @readonly
         * @type {string}
         */
        this.id = id || random.generateUid();

        /**
         * @public
         * @type {TOutgoingData}
         */
        this.outgoingDataTemplate = undefined;

        /**
         * @public
         * @readonly
         * @type {Array<Donuts.Remote.OutgoingAsyncHandler<TOutgoingData, TIncomingData>>}
         */
        this.outgoingPipe = [];

        /**
         * @public
         * @readonly
         * @type {Array<Donuts.Remote.IncomingAsyncHandler<TOutgoingData, TIncomingData>>}
         */
        this.incomingPipe = [];

        /**
         * @protected
         * @type {string}
         */
        this.moduleName = moduleName || "REMOTE";

        /**
         * @protected 
         * @readonly
         * @type {Donuts.Logging.ILog}
         */
        this.log = log;

        /**
         * @private
         * @readonly
         * @type {Array<Donuts.Remote.ICommunicationListener>}
         */
        this.listeners = [];

        /**
         * @private
         * @param {Donuts.Remote.ICommunicationListener} listener
         * @param {Donuts.Remote.IMessage<TIncomingData>} incomingMsg
         */
        this.onIncomingMessage = (listener, incomingMsg) => this.emitIncomingMessageAsync(incomingMsg);
    }

    /**
     * @returns {Promise<void>}
     */
    async disposeAsync() {
        return;
    }

    /**
     * @param {Donuts.Remote.ICommunicationListener} listener
     * @return {this}
     */
    addListener(listener) {
        const index = this.listeners.findIndex((item) => listener === item);

        if (index < 0) {
            listener.on("message", this.onIncomingMessage);
            this.listeners.push(listener);
        }

        return this;
    }

    /**
     * @param {Donuts.Remote.ICommunicationListener} listener
     * @return {this}
     */
    removeListener(listener) {
        const index = this.listeners.findIndex((item) => listener === item);

        if (index >= 0) {
            const listener = this.listeners.splice(index, 1)[0];

            listener.off("message", this.onIncomingMessage);
        }

        return this;
    }

    /**
     * @return {Array.<Donuts.Remote.ICommunicationListener>}
     */
    getListeners() {
        return Array.from(this.listeners);
    }

    /**
     * @public
     * @param {TOutgoingData} data 
     * @returns {Promise<TIncomingData>}
     */
    async pipeAsync(data) {
        /** @type {Donuts.Remote.IMessage<TOutgoingData>} */
        const outgoingMsg = this.generateOutgoingMessage(data);

        this.logMessage(outgoingMsg);

        /** @type {Donuts.Remote.IMessage<TIncomingData>} */
        let incomingMsg = undefined;

        for (const asyncHandler of this.outgoingPipe) {
            try {
                incomingMsg = await asyncHandler(this, outgoingMsg);

            } catch (err) {
                this.logMessage(outgoingMsg, err && utils.isFunction(err.toString) ? err.toString() : JSON.stringify(err), "error");
                throw err;
            }

            if (incomingMsg) {
                break;
            }
        }

        if (!incomingMsg) {
            this.logMessage(outgoingMsg, "No outgoing handler handles the message.", "error");
            throw new Error("No outgoing handler handles the message.");
        }

        this.logMessage(incomingMsg);

        for (const asyncHandler of this.incomingPipe) {
            try {
                incomingMsg = await asyncHandler(this, outgoingMsg, incomingMsg);

            } catch (err) {
                this.logMessage(incomingMsg, err && utils.isFunction(err.toString) ? err.toString() : JSON.stringify(err), "error");
                throw err;
            }
        }

        this.logMessage(incomingMsg, "Incoming message processing completed.");

        return incomingMsg.data;
    }

    /**
     * @protected
     * @virtual
     * @param {Donuts.Remote.IMessage<TIncomingData>} incomingMsg
     * @returns {Promise<void>}
     */
    async emitIncomingMessageAsync(incomingMsg) {
        this.logMessage(incomingMsg);

        for (const asyncHandler of this.incomingPipe) {
            try {
                incomingMsg = await asyncHandler(this, undefined, incomingMsg);

            } catch (err) {
                this.logMessage(incomingMsg, err && utils.isFunction(err.toString) ? err.toString() : JSON.stringify(err), "error");
                throw err;
            }
        }

        this.logMessage(incomingMsg, "Incoming message processing completed.");

        this.emit("data", this, incomingMsg.data);
    }

    /**
     * @protected
     * @virtual
     * @param {TOutgoingData} outgoingData 
     * @returns {Donuts.Remote.IMessage<TOutgoingData>}
     */
    generateOutgoingMessage(outgoingData) {
        /** @type {Donuts.Remote.IMessage<TOutgoingData>} */
        const outgoingMsg = Object.create(null);

        outgoingMsg.data = Object.assign(Object.assign(Object.create(null), this.outgoingDataTemplate), outgoingData);
        outgoingMsg.id = random.generateUid();
        outgoingMsg.source = this.id;
        outgoingMsg.operationId = random.generateUid();
        outgoingMsg.timestamp = Date.now();

        return outgoingMsg;
    }

    /**
     * @protected
     * @virtual
     * @param {Donuts.Remote.IMessage<TOutgoingData | TIncomingData>} message
     * @param {string} [text]
     * @param {Donuts.Logging.Severity} [severity]
     * @returns {void}
     */
    logMessage(message, text, severity) {
        if (!this.log) {
            return;
        }

        severity = severity || "info";

        /** @type {string} */
        let msg = "";

        if (message.id) {
            msg += " " + message.id;
        }

        if (typeof message.timestamp === "number") {
            msg += utils.string.format(" ~{,4:F0}", Date.now() - message.timestamp);
        }

        if (message.source && message.source !== this.id) {
            msg += " <= " + message.source;
        }

        if (message.target && message.target !== this.id) {
            msg += " => " + message.target;
        }

        if (text) {
            msg += ": " + text;
        }

        this.log.writeAsync(
            severity,
            "<{}>{,8} {}{,8}{}{}", // Format: <{Id}>{ModuleName} {OperationName}{OperationId?}{Msg?}
            this.id,
            this.moduleName,
            message.operationId ? `<${message.operationId}>` : "",
            message.operationName || "",
            message.operationDescription ? " " + message.operationDescription : "",
            msg);
    }
}
exports.CommunicationPipeline = CommunicationPipeline;