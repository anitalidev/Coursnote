package elements

func init() {
	Register("question", func() Element { return &Question{} })
}

type Question struct {
	Question    Text   `json:"question"`
	Options     []Text `json:"options"`
	Answer      int    `json:"answer"`
	LastChosen  *int   `json:"lastChosen,omitempty"`
}

func (q *Question) ElementType() string { return "question" }
