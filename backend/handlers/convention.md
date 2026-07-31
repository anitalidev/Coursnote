# Comment convention for HTTP Handlers

## Example
OVERALL: GET user by username
// QPARAM: username (non-empty)
// BADREQ: if username query parameter doesn't exist/empty
// NOTFND: if no user of that username exists
// SERVER: if an internal error occurs
// WRITES: JSON representing a single UserDTO

## Explained

### OVERALL
Gives an overall description of what the handler is used to do

### QPARAM
Lists the parameters expected to be passed into the handler as a query parameter in the request URL

### PTHVAL
Lists the parameters expected to be passed into the handler as a path value in the request URL

### RQBODY
Specifies the information/format of the request body expected by the handler

### BADREQ
Explains what causes an http.StatusBadRequest error

### NOTFND
Explains what causes an http.StatusNotFound error

### SERVER
Explains what causes an http.StatusInternalServerError

### WRITES
What the handler writes into the response object under "intended" or "normal" conditions (ie. no errors)