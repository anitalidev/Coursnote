package elements

func init() {
	Register("cardSlide", func() Element { return &CardSlide{} })
}

type CardSlide struct {
	Cards []Card `json:"cards"`
}

func (cs *CardSlide) ElementType() string {
	return "cardSlide"
}
