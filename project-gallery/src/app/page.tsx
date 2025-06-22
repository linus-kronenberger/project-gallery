import React from 'react';

import HomeNavbar from '../components/home/HomeNavbar';
import HomePage from '../components/home/HomePage';
import HomeFooter from '../components/home/HomeFooter';

import '../app/styles/globals.css';
function Home() {
  return (
    <>
      <HomeNavbar />
      <hr/>
      <HomePage />
      <hr/>
      <HomeFooter />
    </>
  );
}
export default Home;
