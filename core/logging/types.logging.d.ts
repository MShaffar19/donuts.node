//-----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// Licensed under the MIT License. See License file under the project root for license information.
//-----------------------------------------------------------------------------

namespace Donuts.Logging {
    type Severity = "event" | "verbose" | "info" | "warning" | "error" | "critical";

    interface ILoggerSettings {
        [key: string]: any;

        name: string;
        component: string;
    }

    interface ILoggingSettings {
        logCallerInfo?: boolean;
        loggers?: Array<ILoggerSettings>;
        properties?: Object.<string, string>;
    }

    interface ILogger {
        readonly name: string;

        writeAsync(properties: Object.<string, string>, severity: Severity, message: string): Promise<void>;
        writeExceptionAsync(properties: Object.<string, string>, error: Error): Promise<void>;
        writeMetricAsync(properties: Object.<string, string>, name: string, value: number): Promise<void>;
    }

    interface ILog {
        writeMoreAsync(properties: Object.<string, string>, severity: Severity, messageOrFormat: string, ...params: Array<any>): Promise<void>;
        writeAsync(severity: Severity, messageOrFormat: string, ...params: Array<any>): Promise<void>;
        writeInfoAsync(messageOrFormat: string, ...params: Array<any>): Promise<void>;
        writeVerboseAsync(messageOrFormat: string, ...params: Array<any>): Promise<void>;
        writeWarningAsync(messageOrFormat: string, ...params: Array<any>): Promise<void>;
        writeErrorAsync(messageOrFormat: string, ...params: Array<any>): Promise<void>;
        writeCriticalAsync(messageOrFormat: string, ...params: Array<any>): Promise<void>;
        writeExceptionAsync(exception: Error, properties?: Object.<string, string>): Promise<void>;
        writeEventAsync(name: string, properties?: Object.<string, string>): Promise<void>;
        writeMetricAsync(name: string, value?: number, properties?: Object.<string, string>): Promise<void>;

        removeLoggerAsync(name: string): Promise<ILogger>;
        addLoggerAsync(logger: ILogger): Promise<void>;
    }
}
