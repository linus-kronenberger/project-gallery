// props for api management
//default service viewer component

const DefaultServiceViewer = () => {
  return (
    <>
        <form method="post" action="http://localhost:5000/solve">
          <fieldset>
            <legend>Default Service Viewer</legend>
            <input name="term" placeholder="Enter your Term"/>
            <select>
              <option value="POST">POST</option>
              <option value="GET">GET</option>
            </select>
            <input type="submit"/>
          </fieldset>
        </form>
    </>
  );
}

export default DefaultServiceViewer;
