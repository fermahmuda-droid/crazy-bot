import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type DeviceId = string;
export type Timestamp = bigint;
export interface DeviceSettings {
    userName: string;
    fontSize: bigint;
    bgColor: string;
}
export type MessageId = string;
export interface UserAnalytics {
    ip: string;
    country: string;
    city: string;
    imageCount: bigint;
    deviceType: string;
    chatCount: bigint;
    lastSeen: bigint;
}
export interface ChatMessage {
    id: MessageId;
    text: string;
    isUser: boolean;
    sender: string;
    timestamp: Timestamp;
}
export interface DeviceSettingsInput {
    userName: string;
    fontSize: bigint;
    bgColor: string;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface backendInterface {
    clearHistory(deviceId: DeviceId): Promise<void>;
    getAllUserAnalytics(): Promise<Array<UserAnalytics>>;
    getHistory(deviceId: DeviceId): Promise<Array<ChatMessage>>;
    getSettings(deviceId: DeviceId): Promise<DeviceSettings>;
    saveSettings(deviceId: DeviceId, settings: DeviceSettingsInput): Promise<void>;
    sendMessage(deviceId: DeviceId, message: string, chatMode: string): Promise<string>;
    trackUser(ip: string, deviceType: string, country: string, city: string, isImageGen: boolean): Promise<void>;
    transform(raw: {
        context: Uint8Array;
        response: http_request_result;
    }): Promise<http_request_result>;
}
