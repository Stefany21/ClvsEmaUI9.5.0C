export class Mail {
    public Id: number;
    public subject: string;
    public from: string;
    public user: string;
    public pass: string;
    public port: number;
    public Host: string;
    public SSL: boolean;

    constructor( id: number,
                 subject: string,
                 from: string,
                 user: string,
                 pass: string,
                 port: number,
                 Host: string,
                 SSL: boolean ) {
        this.Id = id;
        this.subject = subject;
        this.from = from;
        this.user = user;
        this.pass = pass;
        this.port = port;
        this.Host = Host;
        this.SSL = SSL;
    }

}
