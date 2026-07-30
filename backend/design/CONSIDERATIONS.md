# JSON and SQL

For an early version of an application, file-based JSON storage can be useful because it is quick and easy to set up.

## Pointer relationships

When Go marshals a pointer to JSON, it serializes the value referenced by the pointer. It does not preserve the pointer itself or the object's in-memory identity.

After the JSON is loaded again, Go creates new objects containing the stored values. Therefore, two fields that originally pointed to the same object may no longer share the same object after unmarshalling.

For persistent relationships, store stable IDs instead of relying on pointers:

```go
type Course struct {
    OwnerID string `json:"ownerId"`
}
```

This issue is not unique to JSON. SQL databases also store relationships using identifiers, usually through primary and foreign keys. Memory addresses and pointers are valid only during the current execution of the program.

## SQL vs.(?) JSON

The decision is not always strictly JSON or SQL. SQL tables can contain JSON columns for data that is flexible, nested, or not frequently queried individually.

For example, a course's identity, owner, title, and publication date might use normal SQL columns, while its editor block configuration could be stored as JSON.

## Advantages of SQL as the application grows

### 1. Data size and access

A single JSON database file often needs to be loaded into memory and rewritten when its contents change. As the file grows, this becomes increasingly inefficient.

SQL can retrieve and update only the relevant rows:

```sql
UPDATE courses
SET name = ?
WHERE course_id = ?;
```

### 2. Saving incrementally

With one large JSON file, inserting or updating data usually requires rewriting the file. This makes concurrent access and save-as-you-go behavior more difficult.

A SQL database supports incremental updates, concurrent users, transactions, indexes, and recovery mechanisms.

## Repository pattern

A repository provides an application-facing interface for loading and saving domain objects while hiding the details of the storage technology.

For example:

```go
type CourseRepository interface {
    GetByID(ctx context.Context, id string) (*Course, error)
    Save(ctx context.Context, course *Course) error
}
```

A SQL implementation could translate those operations into SQL queries:

```go
type SQLCourseRepository struct {
    db *sql.DB
}
```

The application usually creates one shared `*sql.DB`. Despite its name, `sql.DB` represents a managed connection pool rather than one physical database connection.

Repositories do not necessarily need to correspond one-to-one with database tables. A repository often represents a domain object or aggregate and may use several tables to reconstruct it.

Separate repository interfaces are particularly useful when the application needs multiple storage implementations, test doubles, or a clear architectural boundary. They should be introduced where they provide meaningful abstraction .

# Choosing how to query the DB
It's important to consider how you want to query the DB to get some information. (Assume in the cases below that we similarly design the database to support the ideas)

For instance, how shall we query the database to get all the topics belonging to the module of ID 241?
### Approach 1:
1. Query Module table for the row/module with ID value equal to 241 to extract the list of topic ids field/column
2. For each topic id query topic table for it's fields

### Approach 2:
1. Query the topic table for all topics/rows such that the ModuleID (aka the ID of the module that owns the topic) is equal to 241

### Which approach seems better?
(Given that n is the amount of topics belonging to module of ID 241) 
I mean one does N + 1 queries, N of which are on the topic DB... and the other only does 1... hmmmm

# Published Course Versioning
A good demonstration of making sure things only take on responsibility for things they are responsible for.

Should a course know about its current static published version? What about the previous versions of static published versions?

The former seems helpful for intuitive/easy access. The latter, however, is not so necessary. Every time we build a course, do we really want to retrieve all static course versions immediately? Or can we easily retrieve that later. As long as the versions point back to the course they are for, we can easily query the version DB for an "owner" course ID and find versions that way.



# Design Patterns in the Code
### 1. Table Repositories are an example of Singleton in the case of this project
### 2. DB (while not implemented by the project) is an example of a Object Pool
### 3. 