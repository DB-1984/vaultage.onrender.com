# Vaultage

**[Try the live app](https://vaultage.onrender.com/)** (the Render/Supabase services may take a minute to wake up).

Vaultage is a file storage API built with Node.js and Express. It explores the backend features needed for a Drive-style service: uploading files, organising their records and controlling who can access them.

The project uses **Supabase** for both its PostgreSQL database and file storage. Prisma manages the structured data, while Multer handles incoming uploads. Zod validates request data before it is processed.

## Authentication and access

Vaultage uses JWTs to maintain authenticated sessions and bcrypt-based password hashing to verify credentials. Access checks determine which files a user can read, write or share.

## Project goal

Vaultage is an experiment in building a storage backend that could be customised and branded for a particular team or product. It focuses on the API and its underlying storage and access controls.

## Built with

* Node.js and Express
* Supabase PostgreSQL and Storage
* Prisma ORM
* Multer
* Zod
* JWT authentication
* bcrypt / bcryptjs
