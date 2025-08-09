package com.restspotfinder.interchange.repository;

import com.restspotfinder.domain.interchange.entity.Interchange;
import com.restspotfinder.domain.interchange.repository.InterchangeRepository;
import com.restspotfinder.domain.place.entity.NaverPlace;
import com.restspotfinder.domain.place.service.NaverPlaceService;
import com.restspotfinder.domain.restarea.entity.RestArea;
import com.restspotfinder.domain.restarea.repository.RestAreaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.List;
import java.util.Map;

@SpringBootTest
@ExtendWith(SpringExtension.class)
class InterchangeRepositoryTest {
    @Autowired
    InterchangeRepository interchangeRepository;
    @Autowired
    RestAreaRepository restAreaRepository;
    @Autowired
    NaverPlaceService naverPlaceService;

    @Test
    void sortingHighwayByStartPoint() {
        // given
        String routeName = "광주대구선";

        // when
        List<Interchange> interchangeList = interchangeRepository.sortHighwayByStartPoint(routeName);

        // then
        for (Interchange interchange : interchangeList) {
            System.out.println("interchange = " + interchange.getName() + " " + interchange.getWeight());
        }

        for(int i = 0; i < interchangeList.size(); i++){
            Interchange interchange = interchangeList.get(i);
            interchange.setWeight(i + 1);
            interchangeRepository.save(interchange);
        }
    }

    @Test
    void checkJC() {
        // given
        
        // when
        List<Interchange> interchangeList = interchangeRepository.findByNameContainingOrderByInterchangeId("IC");

        // then
        int i = 1;
        for (Interchange interchange : interchangeList) {
//            String name = interchange.getName().substring(0, 2);
            String name = interchange.getName();

            List<NaverPlace> naverPlaceList = naverPlaceService.getPlaceListBySearchTerm(interchange.getName());
            if (naverPlaceList.size() == 0) {
                System.out.println(i++ + "interchange = " + interchange.getName());
                System.err.println("검색 결과가 없습니다.");
                System.out.println("*********************************************************");
            } else {
                NaverPlace np = naverPlaceList.get(0);
                String npName = np.getTitle();
                if (name.equals(npName)) {
//                    Interchange updatedInterchange = interchange.updateLocation(np);
//                    interchangeRepository.save(updatedInterchange);
//                    System.err.println("\t" + np);
                } else {
                    System.out.println(i++ + "interchange = " + interchange.getName());
                    for(NaverPlace np2 : naverPlaceList) {
                        if(name.equals(np2.getTitle()))
                            System.err.println("\t" + np2);
                        else
                            System.out.println("\t\t" + np2);
                    }
                    System.out.println("*********************************************************");
                }
            }


        }
    }
    
    @Test
    void test() {
        // given
     
        // when
        List<Interchange> interchangeList = interchangeRepository.findAll();
        Map<String, List<Interchange>> map = Interchange.listToGroupingRouteNameMap(interchangeList);

        for (Map.Entry e : map.entrySet()) {
            List<Interchange> list = (List<Interchange>) e.getValue();
            boolean result = list.stream().anyMatch(Interchange::isStart); // Interchange 클래스에 isStart 메서드가 b
            if(!result) {
                System.out.println(e.getKey());
                List<RestArea> list2 = restAreaRepository.findByRouteName((String) e.getKey());
                if(list2.size() > 0)
                    System.err.println("\t" + e.getKey());
            }
        }
    }
}