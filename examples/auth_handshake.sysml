// Sequence example: an authentication handshake between three participants.
package AuthHandshake {

    part def Client;
    part def AuthServer;
    part def Database;

    part client : Client;
    part auth : AuthServer;
    part db : Database;

    flow login from client to auth;
    flow query from auth to db;
    flow userRecord from db to auth;
    flow token from auth to client;
}
