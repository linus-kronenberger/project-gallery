import React from 'react';

import HomeNavbar from '../../../../components/home/HomeNavbar';
import DefaultServiceViewer from '../../../../components/projects/DefaultServiceViewer';
import HomeFooter from '../../../../components/home/HomeFooter';

import '../../../../app/styles/globals.css';

function TermSolverPage() {
  return (
    <>
      <HomeNavbar />
      <hr/>
      <DefaultServiceViewer/>
      <hr/>
      <HomeFooter />
    </>
  );
}
export default TermSolverPage;
