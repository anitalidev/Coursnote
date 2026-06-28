package elements

func init() {
	Register("questionSlide", func() Element { return &QuestionSlide{} })
}

type QuestionSlide struct {
	Questions []Question `json:"questions"`
}

func (q *QuestionSlide) ElementType() string {
	return "questionSlide"
}
