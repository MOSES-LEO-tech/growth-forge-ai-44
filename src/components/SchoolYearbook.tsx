import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

interface Yearbook {
  year: number;
  coverUrl: string;
}

interface SchoolYearbookProps {
  yearbooks: Yearbook[];
}

const SchoolYearbook = ({ yearbooks }: SchoolYearbookProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
      {yearbooks.map((yearbook) => (
        <Card
          key={yearbook.year}
          className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
        >
          <CardContent className="p-4">
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-3">
              <img
                src={yearbook.coverUrl}
                alt={`Yearbook ${yearbook.year}`}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center p-3">
                <BookOpen className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <p className="text-center font-semibold">{yearbook.year}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SchoolYearbook;
