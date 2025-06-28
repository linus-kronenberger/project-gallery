// props for api management
//default service 

'use client'

const handleSubmit = (event: React.SyntheticEvent) => {
  event.preventDefault();
  
  const form = event.target;

  if (!(form instanceof HTMLFormElement)) {
    console.error('Form not found');
    return;
  }
  const term = form.term.value;
  const method = form.method;

  fetch('http://127.0.0.1:5000/solve', {
    method: method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({"term": term})
  })
  .then(response => response.text())
  .then(data => {
    console.log('Success:', data);
    alert(`Result: ${data}`);
  })
  .catch((error) => {
    console.error('Error:', error);
    alert(`Error: ${error}`);
  });
}

const DefaultServiceViewer = () => {
  return (
    <>
        <form onSubmit={handleSubmit} method="post" action="http://localhost:5000/solve">
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
