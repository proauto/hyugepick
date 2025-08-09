package com.restspotfinder.domain.search.repository;

import com.restspotfinder.domain.search.entity.Search;
import org.springframework.data.jpa.repository.JpaRepository;


public interface SearchRepository extends JpaRepository<Search, Long> {
}