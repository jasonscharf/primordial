import { MutableEntity } from "../models/MutableEntity";
import { SpoolerTask } from "../models/system/SpoolerTask";


export class SpoolerTaskEntity extends MutableEntity implements SpoolerTask {
    prevRun?: Date;
    nextRun?: Date;
    lastError?: string;
    name: string;
    frequencySeconds: number;
    state?: unknown;
    isRunning: boolean;
    runCount: number;


    constructor(row?: Partial<SpoolerTask>) {
        super(row);

        if (row) {
            this.prevRun = row.prevRun || null;
            this.nextRun = row.nextRun || null;
            this.lastError = row.lastError || null;
            this.name = row.name;
            this.frequencySeconds = row.frequencySeconds;
            this.state = row.state; 
            this.isRunning = row.isRunning;
            this.runCount = row.runCount;
        }
    }

    static fromRow(row?: Partial<SpoolerTask>) {
        return row ? new SpoolerTaskEntity(row) : null;
    }
}
