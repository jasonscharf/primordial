import { MutableModel } from "../MutableEntity";


export interface UserInvite extends MutableModel {
    inviterUserId: string;
    redeemerUserId: string;
    code: string;
    email: string;
    redeemed: boolean;
}
