import {EventCallback, TimedEvent} from "../../types";


export class EventManager {
    private eventQueue: TimedEvent[] = [];
    private subscribers: Map<string, EventCallback[]> = new Map()

    public scheduleEvent(event: TimedEvent): void {
        this.eventQueue.push(event)
        this.eventQueue.sort((a, b) => a.time - b.time)
    }

    public subscribe(eventType: string, callback: EventCallback): void {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, [])
        }
        this.subscribers.get(eventType)!.push(callback)
    }

    public processEvents(currentTime: number): void {
        while (this.eventQueue.length > 0 && this.eventQueue[0].time <= currentTime) {
            const event = this.eventQueue.shift()!
            this.triggerEvent(event)
        }
    }

    private triggerEvent(event: TimedEvent): void {
        const callbacks = this.subscribers.get(event.type) || []
        for (const callback of callbacks) {
            callback(event)
        }
    }

}