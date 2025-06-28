import HomeNavbar from '../../components/home/HomeNavbar';
import HomeFooter from '../../components/home/HomeFooter';

function AboutPage() {
    return (
        <>
            <HomeNavbar/>
            <header>
                <h1>About Me</h1>
            </header>
            <main>
                <p>Welcome to my about page! This is a simple React project showcasing my work.</p>
                <ul>
                    <li><a href="https://misterls.itch.io/">itch.io</a></li>
                </ul>
            </main>
            <HomeFooter/>
        </>
    );
}

export default AboutPage;