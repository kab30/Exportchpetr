/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home';
import NovelDetails from './components/NovelDetails';
import ExtractChapters from './components/ExtractChapters';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'novel/:id', element: <NovelDetails /> },
      { path: 'novel/:id/extract', element: <ExtractChapters /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
