import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";

interface HallOfFameMember {
  name: string;
  role: string;
  image: string;
  bio: string;
}

interface SchoolHallOfFameProps {
  members: HallOfFameMember[];
  isInView: boolean;
}

const SchoolHallOfFame = ({ members, isInView }: SchoolHallOfFameProps) => {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {members.map((member, index) => (
        <Card
          key={member.name}
          className={`group hover:shadow-xl transition-all duration-700 ${
            isInView 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
          style={{ 
            transitionDelay: isInView ? `${index * 150}ms` : '0ms'
          }}
        >
          <CardContent className="p-6 text-center">
            <div className="relative inline-block mb-4">
              <img
                src={member.image}
                alt={member.name}
                className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-primary/20 group-hover:border-primary/50 transition-colors"
              />
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center border-4 border-background">
                <Trophy className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-1">{member.name}</h3>
            <p className="text-sm text-primary font-medium mb-3">{member.role}</p>
            <p className="text-sm text-muted-foreground">{member.bio}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SchoolHallOfFame;
