//-----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// Licensed under the MIT License. See License file under the project root for license information.
//-----------------------------------------------------------------------------
namespace Donuts.Remote {
    interface ObjectResolver {
        (proxy: IObjectRemotingProxy, name: string, ...extraArgs: Array<any>): Promise<any>;
    }

    interface IObjectRemotingProxy extends IDisposable {
        readonly id: string;
        readonly routePattern: IRoutePattern;
        readonly communicator: ICommunicator;

        resolver: ObjectResolver;

        requestAsync<T>(identifier: string, ...extraArgs: Array<any>): Promise<T>;
        releaseAsync(refId: string): Promise<void>;

        applyAsync<T>(refId: string, thisArg: any, args: Array<any>): Promise<T>;
        getPropertyAsync<T>(refId: string, property: string | number): Promise<T>;
        setPropertyAsync(refId: string, property: string | number, value: any): Promise<boolean>;
    }

    interface ISignatureIdentifier {
        type: string;
    }

    interface ICertSignatureIdentifier extends ISignatureIdentifier {
        type: "cert";
    }

    interface IMessage<TData> extends Donuts.IStringKeyDictionary {
        id?: string;
        source?: string;
        target?: string;

        /**
         * In milliseconds.
         */
        timestamp?: number;

        data: TData;

        operationName?: string;
        operationDescription?: string;
        operationId?: string;

        integrity?: string;
        signature?: string;
        signatureIdentifier?: ISignatureIdentifier;
    }

    interface ICommunicationListener {
        on<TIncommingData>(event: "message", handler: (listener: ICommunicationListener, incomingMessage: IMessage<TIncommingData>) => void);
        once<TIncommingData>(event: "message", handler: (listener: ICommunicationListener, incomingMessage: IMessage<TIncommingData>) => void);
        off<TIncommingData>(event: "message", handler: (listener: ICommunicationListener, incomingMessage: IMessage<TIncommingData>) => void);
    }

    type OutgoingAsyncHandler<TOutgoingData, TIncommingData> = (pipeline: ICommunicationPipeline<TOutgoingData, TIncommingData>, outgoingMsg: IMessage<TOutgoingData>) => Promise<IMessage<TIncommingData>>;
    type IncomingAsyncHandler<TOutgoingData, TIncommingData> = (pipeline: ICommunicationPipeline<TOutgoingData, TIncommingData>, outgoingMsg: IMessage<TOutgoingData>, incomingMsg: IMessage<TIncommingData>) => Promise<IMessage<TIncommingData>>;

    interface ICommunicationPipeline<TOutgoingData, TIncommingData> extends IDisposable, IEventEmitter {
        readonly id: string;

        outgoingDataTemplate: TOutgoingData;

        readonly outgoingPipe: Array<OutgoingAsyncHandler<TOutgoingData, TIncommingData>>;
        readonly incomingPipe: Array<IncomingAsyncHandler<TOutgoingData, TIncommingData>>;

        addListener(listener: ICommunicationListener): this;
        removeListener(listener: ICommunicationListener): this;
        getListeners(): Array<ICommunicationListener>;

        on(event: "data", handler: (pipeline: ICommunicationPipeline<TOutgoingData, TIncommingData>, incomingData: TIncommingData) => void): this;
        once(event: "data", handler: (pipeline: ICommunicationPipeline<TOutgoingData, TIncommingData>, incomingData: TIncommingData) => void): this;
        off(event: "data", handler: (pipeline: ICommunicationPipeline<TOutgoingData, TIncommingData>, incomingData: TIncommingData) => void): this;

        pipeAsync(data: TOutgoingData): Promise<TIncommingData>;
    }
}