package elements

func init() {
	Register("cardSlide", func() Element { return &CardSlide{} })
}

type CardSlide struct {
	ID    string `json:"id,omitempty"`
	Cards []Card `json:"cards"`
}

func (cs *CardSlide) ElementType() string {
	return "cardSlide"
}
