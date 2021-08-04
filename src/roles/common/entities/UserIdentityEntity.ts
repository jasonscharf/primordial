import { MutableEntity } from "../models/MutableEntity";
import { UserIdentity, UserIdentityProvider } from "../models/user/UserIdentity";


export class UserIdentityEntity extends MutableEntity implements UserIdentity {
    provider: UserIdentityProvider
    userId: string;
    pid: string;
    nameFirst: string;
    nameMiddle: string;
    nameLast: string;


    constructor(row?: Partial<UserIdentity>) {
        super(row);

        if (row) {
            this.provider = row.provider;
            this.userId = row.userId;
            this.pid = row.pid;
            this.nameFirst = row.nameFirst;
            this.nameMiddle = row.nameMiddle;
            this.nameLast = row.nameLast;
        }
    }

    static fromRow(row?: Partial<UserIdentity>) {
        return row ? new UserIdentityEntity(row) : null;
    }
}
