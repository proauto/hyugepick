import { createBrowserRouter } from 'react-router-dom'
import { NaverPage } from '../pages'
import { PATH } from './constants'
import Layout from './Layout'

const router = createBrowserRouter([
  {
    path: PATH.MAIN,
    element: <Layout />,
    children: [
      {
        path: PATH.MAIN,
        element: <NaverPage />,
      },
    ],
  },
])

export default router
