import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GraduationCap, Target, Users, Zap } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            About StudentHub
          </h1>
          
          <p className="text-lg text-muted-foreground mb-12">
            StudentHub is dedicated to empowering students to document their educational journey 
            and unlock their full potential through intelligent tracking and personalized recommendations.
          </p>

          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-8">Our Mission</h2>
            <div className="bg-card rounded-lg p-8 border shadow-sm">
              <p className="text-lg leading-relaxed">
                We believe every student deserves the opportunity to showcase their achievements, 
                discover their potential, and access resources that can transform their future. 
                StudentHub provides the tools and insights students need to track their academic 
                progress, identify opportunities, and make informed decisions about their education.
              </p>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-8">Our Values</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card rounded-lg p-6 border shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Student-Focused</h3>
                <p className="text-muted-foreground">
                  Every feature we build puts student success at the center, ensuring our platform 
                  serves their unique needs and goals.
                </p>
              </div>

              <div className="bg-card rounded-lg p-6 border shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Innovation</h3>
                <p className="text-muted-foreground">
                  We leverage cutting-edge technology and AI to provide intelligent insights 
                  and personalized recommendations.
                </p>
              </div>

              <div className="bg-card rounded-lg p-6 border shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Collaboration</h3>
                <p className="text-muted-foreground">
                  We bring together students, teachers, and parents to create a supportive 
                  ecosystem for academic success.
                </p>
              </div>

              <div className="bg-card rounded-lg p-6 border shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                  <GraduationCap className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Accessibility</h3>
                <p className="text-muted-foreground">
                  We strive to make educational opportunities accessible to all students, 
                  regardless of their background or circumstances.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-8">Our Story</h2>
            <div className="bg-card rounded-lg p-8 border shadow-sm">
              <p className="text-lg leading-relaxed mb-4">
                StudentHub was founded by educators and technologists who recognized the need 
                for a comprehensive platform that helps students track their achievements, 
                discover opportunities, and reach their full potential.
              </p>
              <p className="text-lg leading-relaxed">
                Today, we're proud to serve thousands of students, helping them document their 
                journey, find scholarships, and make informed decisions about their educational future.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
