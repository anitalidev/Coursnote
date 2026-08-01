FROM golang:1.26.3

WORKDIR /backend

COPY . .

RUN go mod download
RUN go build -o server .

EXPOSE 8081

CMD ["./server"]