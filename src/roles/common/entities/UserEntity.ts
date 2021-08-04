import { MutableEntity } from "../models/MutableEntity";
import { User } from "../models/user/User";
import { UserIdentity } from "../models/user/UserIdentity";


export class UserEntity extends MutableEntity implements User {
    nameFirst: string;
    nameMiddle: string;
    nameLast: string;


    constructor(row?: Partial<User>) {
        super(row);

        if (row) {
            this.nameFirst = row.nameFirst;
            this.nameMiddle = row.nameMiddle;
            this.nameLast = row.nameLast;
        }
    }

    static fromRow(row?: Partial<UserIdentity>) {
        return row ? new UserEntity(row) : null;
    }
}
