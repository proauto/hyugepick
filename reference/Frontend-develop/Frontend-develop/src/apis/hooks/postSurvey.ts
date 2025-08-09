import apiClient from '../apiClient'

interface SurveyRequest {
  email: string
  text: string
}

const postSurvey = async (surveyRequest: SurveyRequest) => {
  await apiClient.post('/survey', surveyRequest)
}

export default postSurvey