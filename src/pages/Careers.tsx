import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Heart, Rocket, Users } from "lucide-react";
import { Link } from "react-router-dom";

const Careers = () => {
  const openPositions = [
    {
      title: "Senior Full Stack Developer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      description: "Help build the future of educational technology with React, Node.js, and modern cloud infrastructure."
    },
    {
      title: "Product Designer",
      department: "Design",
      location: "Remote",
      type: "Full-time",
      description: "Create beautiful, intuitive experiences that empower students worldwide."
    },
    {
      title: "Education Success Manager",
      department: "Customer Success",
      location: "Remote",
      type: "Full-time",
      description: "Work directly with schools and educational institutions to maximize their impact."
    },
    {
      title: "Machine Learning Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      description: "Develop AI-powered features that provide personalized student recommendations."
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Join Our Team
          </h1>
          
          <p className="text-lg text-muted-foreground mb-12">
            Help us build the future of education technology and make a real impact 
            on students' lives around the world.
          </p>

          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-8">Why StudentHub?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card rounded-lg p-6 border shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Mission-Driven</h3>
                <p className="text-muted-foreground">
                  Work on products that directly impact students' educational journeys and future success.
                </p>
              </div>

              <div className="bg-card rounded-lg p-6 border shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                  <Rocket className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Fast Growth</h3>
                <p className="text-muted-foreground">
                  Join a rapidly growing company with opportunities to take on new challenges and grow your career.
                </p>
              </div>

              <div className="bg-card rounded-lg p-6 border shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Great Team</h3>
                <p className="text-muted-foreground">
                  Work with talented, passionate people who care about education and technology.
                </p>
              </div>

              <div className="bg-card rounded-lg p-6 border shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                  <Briefcase className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Flexibility</h3>
                <p className="text-muted-foreground">
                  Enjoy remote work options, flexible schedules, and a healthy work-life balance.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-8">Open Positions</h2>
            <div className="space-y-4">
              {openPositions.map((position, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl mb-2">{position.title}</CardTitle>
                        <CardDescription>
                          {position.department} • {position.location} • {position.type}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{position.description}</p>
                    <Button asChild>
                      <Link to="/contact">Apply Now</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="bg-card rounded-lg p-8 border shadow-sm text-center">
            <h2 className="text-2xl font-bold mb-4">Don't see the right role?</h2>
            <p className="text-muted-foreground mb-6">
              We're always looking for talented people. Send us your resume and tell us how 
              you'd like to contribute to StudentHub's mission.
            </p>
            <Button asChild size="lg">
              <Link to="/contact">Get In Touch</Link>
            </Button>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Careers;
