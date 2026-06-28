package elements

func init() {
	Register("question", func() Element { return &Question{} })
}

type Question struct {
	Question string   `json:"question"`
	Options  []string `json:"options"`
	Answer   int      `json:"answer"`
}

func (q *Question) ElementType() string { return "question" }
