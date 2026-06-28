package elements

func init() {
	Register("card", func() Element { return &Card{} })
}

type Card struct {
	Header  Text `json:"header"`
	Content Text `json:"content"`
}

func (c *Card) ElementType() string {
	return "card"
}
