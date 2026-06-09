package com.nikaotech.smartrf.repository;

import com.nikaotech.smartrf.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    List<User> findByDailyReportsEnabledTrue();
    List<User> findByDailyReportsEnabledTrueAndDailyReportTime(String dailyReportTime);
}
