package elements

func init() {
	Register("card", func() Element { return &Card{} })
}

type Card struct {
	Header  string `json:"header"`
	Content string `json:"content"`
}

func (c *Card) ElementType() string {
	return "card"
}
