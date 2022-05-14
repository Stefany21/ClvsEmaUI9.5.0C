export class Users {

    public Id: number;
    public FullName: string;
    public Email: string;
    public EmailConfirmed: boolean;
    public UserName: string;
    public PasswordHash: string;
    public Active: boolean;
    public CreateDate: Date;
    public Owner: boolean;

}

/**
 * Clase para el registro de usuarios
 */
export class User {
    public Email: string; // correo del usuario
    public Password: string; // contrasenna del usuario
    public FullName: string; // nombre completo del usuario

    constructor( Email: string, Password: string, FullName: string) {
        this.Email = Email;
        this.Password = Password;
        this.FullName = FullName;
    }

}
