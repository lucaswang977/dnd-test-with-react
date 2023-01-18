// This Drag and Drop in React practicing project
//
// Constraints:
// - Every list should have a fixed width.

import { GridData } from "./types";
import Grid from "./components/grid";

function App() {
  const initialGridData: GridData = [
    [
      {
        id: 0,
        text: "dummy text of the printing and typesetting industry. Lorem Ipsum has been the",
      },
      {
        id: 1,
        text: "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using",
      },
      {
        id: 2,
        text: "There are many variations of passages of Lorem Ipsum available, but the majority have suffered",
      },
    ],
    [
      {
        id: 3,
        text: "Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. ",
      },
      {
        id: 4,
        text: "There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour ",
      },
      {
        id: 5,
        text: 'The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form',
      },
      {
        id: 6,
        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam",
      },
      {
        id: 7,
        text: "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae",
      },
    ],
    [
      {
        id: 8,
        text: "But I must explain to you how all this mistaken idea of denouncing",
      },
      {
        id: 9,
        text: "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati ",
      },
      {
        id: 10,
        text: "On the other hand, we denounce with righteous indignation and dislike men who are so beguiled and demoralized by the charms of pleasure of the moment",
      },
      {
        id: 11,
        text: "be welcomed and every pain avoided. But in certain circumstances and owing to the claims of duty or the obligations of business it will frequently occur that",
      },
    ],
    [
      {
        id: 12,
        text: "But in certain circumstances and owing to the claims of duty or the obligations of business it will frequently occur that",
      },
    ],
  ];

  return (
    <div className="app">
      <h1 className="title">Drag and Drop with React & Typescript</h1>
      <Grid gridData={initialGridData} />
    </div>
  );
}

export default App;
