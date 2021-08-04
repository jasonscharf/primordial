import { MutableEntity } from "../models/MutableEntity";
import { UserInvite } from "../models/user/UserInvite";


export class UserInviteEntity extends MutableEntity implements UserInvite {
    inviterUserId: string;
    redeemerUserId: string;
    code: string;
    email: string;
    redeemed: boolean;

    constructor(row?: Partial<UserInvite>) {
        super(row);

        if (row) {
            this.inviterUserId = row.inviterUserId;
            this.redeemerUserId = row.redeemerUserId;
            this.code = row.code;
            this.email = row.email;
            this.redeemed = row.redeemed;
        }
    }
}
