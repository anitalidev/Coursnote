package elements

func init() {
	Register("question", func() Element { return &Question{} })
}

type Question struct {
	ID          string `json:"id,omitempty"`
	Question    Text   `json:"question"`
	Options     []Text `json:"options"`
	Answer      int    `json:"answer"`
}

func (q *Question) ElementType() string { return "question" }
