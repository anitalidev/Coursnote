package elements

func init() {
	Register("text", func() Element { return &Text{} })
}

type Text struct {
	Content string `json:"content"`
}

func (t *Text) ElementType() string { return "text" }
