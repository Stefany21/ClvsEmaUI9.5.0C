export class Perms {
    public Id: number;
    public Name: string;
    public Description: string;
    public Active: boolean;
}

export class PermsUserEdit {
    public UserId: number;
    public UserPerms: Perms[];
    public dbcode: string;
}
