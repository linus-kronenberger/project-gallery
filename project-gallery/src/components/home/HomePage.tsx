import React from 'react';
import Link from 'next/link'

const HomePage = () => {
  return (
    <>
      <header>
        <h1>My Simple React Home Page</h1>
      </header>
      <main>
        <p>Welcome to my simple React home page! This is a basic example of a React project.</p>
        <ul>
          <li><a href="https://linus-kronenberger.github.io/learning_presentations/">learning_presentations</a></li>
          <li><Link href="/projects/py/term_solver">Python Term Solver</Link></li>
          <li><Link href="">AI Hub</Link></li>
          <li><Link href="">Spring Fiori</Link></li>
        </ul>
      </main>
    </>
  );
}

export default HomePage;
